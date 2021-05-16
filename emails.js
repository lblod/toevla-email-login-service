import { updateSudo as update } from '@lblod/mu-auth-sudo';
import { uuid, sparqlEscapeUri, sparqlEscapeString } from 'mu';

const APP_BASE_URL = process.env.APP_BASE_URL; // expected to end with a '/'
const EMAIL_SENDER = process.env.EMAIL_SENDER; // email-address from which emails will be sent out
const OUTBOX_URI = process.env.OUTBOX_URI; // url of the outbox

export async function sendLoginEmail(email, key) {
  const loginLink = `${APP_BASE_URL}email-login`
    + `?key=${key}`
    + `&email=${encodeURIComponent(email)}`;
  const sender = EMAIL_SENDER;
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
                      nmo:isPartOf ${sparqlEscapeUri(OUTBOX_URI)}.
                  }
                }`);
}
