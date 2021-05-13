import { query, update } from '@lblod/mu-auth-sudo';
import { uuid, sparqlEscapeString, sparqlEscapeUri, sparqlEscapeDateTime } from 'mu';

class AccountNotFoundError extends Error {
  constructor(email) {
    super(`Account could not be found for ${email}.`);
  }
}

/**
 * Retrieves the account for a specific email address.
 *
 * @param {string} email Email address in string format.
 * @return {string} URI of the account.
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
    return response.results[0].bindings.account.value;
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

export { AccountNotFoundError, getAccountForEmail, insertKeyForAccount };
