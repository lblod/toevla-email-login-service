import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';

class AccountNotFoundError extends Error {
  constructor(email) {
    super(`Account could not be found for ${email}.`);
  }
}

/**
 * Copies over core account info from inter graph to account graph.
 *
 * @param {string} account URI of the account
 */
async function transferCoreAccountInfoFromInter(account) {
  // remove the account
  await update(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                DELETE WHERE {
                  GRAPH ${sparqlEscapeUri(account)} {
                    ${sparqlEscapeUri(account)} ?p ?o.
                  }
                }`);
  // remove the person
  await update(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                DELETE WHERE {
                  GRAPH ${sparqlEscapeUri(account)} {
                    ?person a foaf:Person; ?p ?o.
                  }
                }`);
  // copy over the data from inter
  await update(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                INSERT {
                  GRAPH ${sparqlEscapeUri(account)} {
                    ${sparqlEscapeUri(account)}
                      a foaf:OnlineAccount;
                      ext:email ?email;
                      mu:uuid ?accountUuid.
                    ?person
                      a foaf:Person;
                      foaf:account ${sparqlEscapeUri(account)};
                      foaf:firstName ?firstName;
                      foaf:familyName ?familyName.
                  }
                } WHERE {
                  GRAPH <http://data.toevla.org/inter> {
                    ${sparqlEscapeUri(account)}
                      a foaf:OnlineAccount;
                      ext:email ?email;
                      mu:uuid ?accountUuid.
                    ?person
                      foaf:account ${sparqlEscapeUri(account)};
                      a foaf:Person.
                    OPTIONAL { ?person foaf:firstName ?firstName. }
                    OPTIONAL { ?person foaf:familyName ?familyName. }
                  }
                }`);
}

/**
 * Ensures the account roles in the accounts graph are the ones that are
 * currently in the inter graph.
 *
 * Note that the data will be temporarily out of sync because we do not
 * calculate differences.
 *
 * @param {string} account URI of the account
 * @return {Promise} Resolves when the graph has been updated.
 */
async function transferAccountRolesFromInter(account) {
  // remove old account roles
  await update(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                DELETE WHERE {
                  GRAPH ${sparqlEscapeUri(account)} {
                    ${sparqlEscapeUri(account)} ext:hasRole ?role.
                    ?role ?p ?o.
                  }
                }`);
  // insert new account roles
  await update(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                INSERT {
                  GRAPH ${sparqlEscapeUri(account)} {
                    ${sparqlEscapeUri(account)} ext:hasRole ?role.
                    ?role ?p ?o.
                  }
                } WHERE {
                  GRAPH <http://data.toevla.org/inter> {
                    ${sparqlEscapeUri(account)} ext:hasRole ?role.
                    ?role ?p ?o.
                  }
                }`);
}

/**
 * Syncs the account from inter to the account graph ensuring the
 * account exists in the right graph and that the access rights are up
 * to date.
 *
 * @param {string} email The email address which is connected to the
 * account.
 */
async function syncAccountFromInter(email) {
  // ensure the account exists
  let account;
  try {
    account = await getAccountForEmail( email );
  } catch (e) {
    if( e instanceof AccountNotFoundError ) {
      account = await getAccountForEmailFromInter( email );
      await transferCoreAccountInfoFromInter( account );
    } else {
      throw e;
    }
  }

  // ensure the access rights have been propagated.
  await transferAccountRolesFromInter( account );
}

/**
 * Retrieves the account for a specific email address from the Inter graph.
 *
 * @param {string} email The email address which is connected to the
 * account.
 */
async function getAccountForEmailFromInter(email) {
  const response =
    await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                 PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                 SELECT ?account
                 WHERE {
                   GRAPH <http://data.toevla.org/inter> {
                     ?account a foaf:OnlineAccount;
                       ext:email ${sparqlEscapeString(email)}.
                   }
                 }`);

  try {
    return response.results.bindings[0].account.value;
  } catch (e) {
    throw new AccountNotFoundError(email);
  }
}

/**
 * Retrieves the account for a specific email address.
 *
 * @param {string} email Email address in string format.
 * @return {Promise<string>} URI of the account.
 * @throws AccountNotFoundError When no account could be found.
 */
async function getAccountForEmail(email) {
  const response =
    await query(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                 PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                 SELECT ?account
                 WHERE {
                   GRAPH ?account {
                     ?account a foaf:OnlineAccount;
                       ext:email ${sparqlEscapeString(email)}.
                   }
                 }`);
  try {
    return response.results.bindings[0].account.value;
  } catch (e) {
    throw new AccountNotFoundError(email);
  }
}

/**
 * Inserts the key information to the supplied account.
 *
 * @param {string} key Key to be used for logging in.
 * @param {string} account String representation of the account's URI.
 */
async function insertKeyForAccount(key, account) {
  const keyUuid = uuid();
  const keyUri = `http://data.toevla.org/login-keys/${keyUuid}`;

  await update(`PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
                PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
                INSERT DATA {
                  GRAPH ${sparqlEscapeUri(account)} {
                    ${sparqlEscapeUri(account)} ext:hasKey ${sparqlEscapeUri(keyUri)}.
                    ${sparqlEscapeUri(keyUri)} a ext:LoginKey;
                       mu:uuid ${sparqlEscapeString(keyUuid)};
                       ext:key ${sparqlEscapeString(key)};
                       ext:createdAt ${sparqlEscapeDateTime(new Date())}.
                  }
                }`);
}

export { AccountNotFoundError, getAccountForEmail, insertKeyForAccount, syncAccountFromInter };
