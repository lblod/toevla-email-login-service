// see https://github.com/mu-semtech/mu-javascript-template for more info
import { app, errorHandler } from 'mu';
import generateKey from './util/generate-key';
import { insertKeyForAccount, getAccountForEmail, AccountNotFoundError, syncAccountFromInter } from './queries';
import { logout, canLogin, login, getAccountForEmailAndKey, transferAccountRolesFromInter } from './queries';
import { getSessionId, getAccountForSession, SessionNotFoundError } from './queries';
import { sendLoginEmail } from './emails';

app.post('/emails/:email/keys', async function(req, res) {
  try {
    // 1. generate a new key
    const key = generateKey(32);
    const email = req.params.email;

    // 2. update the account graph
    await syncAccountFromInter(email);

    // 3. get the account link
    const account = await getAccountForEmail(email);

    // 3. add data if account exists for key
    await insertKeyForAccount(key, account);

    // 4. send out the email
    await sendLoginEmail(email, key);

    // 5. respond positive
    res.status(200).send(JSON.stringify({ message: "Email sent" }));
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      // maybe throw error
      res.status(500).send(JSON.stringify({ message: "Something went wrong" }));
    }
  }
});

app.post('/login', async function(req, res) {
  try {
    // 1. get environment info
    const { email, key } = req.body.data.attributes;
    const sessionUri = req.get('mu-session-id');

    // 2. remove current login from session
    await logout(sessionUri);

    // 3. get account for credentials
    const { account, uuid: accountUuid } = await getAccountForEmailAndKey(email, key);

    // 3. update account roles info
    await transferAccountRolesFromInter(account);

    // 4. add new login to session
    await login(sessionUri, account);

    // 5. request login recalculation
    const sessionId = await getSessionId( sessionUri );
    return res
      .header('mu-auth-allowed-groups', 'CLEAR')
      .status(201)
      .send({
        links: {
          self: '/sessions/current'
        },
        data: {
          type: 'sessions',
          id: sessionId
        },
        relationships: {
          account: {
            links: { related: `/accounts/${accountUuid}` },
            data: { type: 'accounts', id: accountUuid }
          }
        }
      });
  } catch (e) {
    if (e instanceof AccountNotFoundError) {
      res.status(500).send({ message: "Invalid credentials" });
    } else {
      res.status(500).send({ message: "Something went wrong" });
    }
  }
});

app.delete('/sessions/current', async function(req, res) {
  await logout(req.get('mu-session-id'));
  res
    .status(204)
    .header('mu-auth-allowed-groups', 'CLEAR')
    .send();
});

app.get('/sessions/current', async function(req, res) {
  try {
    const session = req.get('mu-session-id');
    const sessionId = await getSessionId( session );
    const accountId = await getAccountForSession( session );

    const resp = {
      links: {
        self: "/email-login/sessions/current" // TODO: make dynamic
      },
      data: {
        type: 'sessions',
        id: sessionId
      },
      relationships: {
        account: {
          links: {
            related: `/accounts/${accountId}`
          },
          data: {
            type: "accounts",
            id: accountId
          }
        }
      }
    };

    res
      .status(200)
      .send(resp);
  } catch (e) {
    if( e instanceof SessionNotFoundError ) {
      return res.status(500).send("Could not find session.");
    } else if ( e instanceof AccountNotFoundError ) {
      return res.status(500).send("Could not find account.");
    } else {
      return res.status(500).send("Error occurred");
    }
  }
});

app.use(errorHandler);
