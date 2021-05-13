// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app, errorHandler } from 'mu';
import generateKey from './util/generate-key';
import { insertKeyForAccount, getAccountForEmail, AccountNotFoundError, syncAccountFromInter } from './queries';
import { sendLoginEmail } from './emails';

app.post('/emails/:email/keys', async function(req, res) {
  try {
    // 1. generate a new key
    const key = generateKey(32);
    const email = req.params.email;

    // 2. update the account graph
    await syncAccountFromInter( email );

    // 3. get the account link
    const account = await getAccountForEmail( email );

    // 3. add data if account exists for key
    await insertKeyForAccount( key, account );

    // 4. send out the email
    await sendLoginEmail( email, key );

    // 5. respond positive
    res.status(200).send(JSON.stringify({message: "Email sent"}));
  } catch (e) {
    if( e instanceof AccountNotFoundError ) {
      // maybe throw error
      res.status(500).send(JSON.stringify({message: "Something went wrong"}));
    }
  }
});

app.use(errorHandler);
