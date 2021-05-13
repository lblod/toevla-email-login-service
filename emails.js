import { updateSudo as update } from '@lblod/mu-auth-sudo';
import { uuid, sparqlEscapeUri, sparqlEscapeString } from 'mu';

export async function sendLoginEmail(email, key) {
  const loginLink = "https://toegankelijk.vlaanderen.be/email-login"
    + `?key=${key}`
    + `&email=${encodeURIComponent(email)}`;
  const sender = "noreply-toevla@semantic.works"; // TODO: update sending address to "noreply-toegankelijk@vlaanderen.be"
  const subject = "[TEST] Login key toegankelijk.vlaanderen.be";
  const message = `Beste,\n\nMet onderstaande link kan je inloggen op je account op toegankelijk.vlaanderen.be\n${loginLink} \n\nMet vriendelijke groeten,\nToegankelijk Vlaanderen`;

  await send({ from: sender, to: email, subject, message });
}

/**
 * Sends an email.
 *
 * @param {string} from String address that sends the email
 * @param {string} to String address that receives the email
 * @param {string} subject Message subject
 * @param {string} message Message body
 */
export async function send({ from, to, subject, message }) {
  const mailUri = `http://data.toevla.org/mails/${uuid()}`;

  await update(`PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
                PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
                PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
                INSERT DATA {
                  GRAPH <http://mu.semte.ch/graphs/system/email> {
                    ${sparqlEscapeUri(mailUri)}
                      a nmo:Email;
                      nmo:messageFrom ${sparqlEscapeString(from)};
                      nmo:emailTo ${sparqlEscapeString(to)};
                      nmo:messageSubject ${sparqlEscapeString(subject)};
                      nmo:plainTextMessageContent ${sparqlEscapeString(message)};
                      nmo:isPartOf <http://data.lblod.info/id/mailfolder/outbox>.
                  }
                }`);
}
