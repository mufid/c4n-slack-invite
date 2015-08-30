
import request from 'superagent';

export default function invite_prevalidate_discourse_email(r, fn) {

  request
  .get(`${r.disc_base_url}/admin/users/list/all.json`)
  .query({api_key: r.disc_api_key})
  .query({api_username: r.disc_api_username})
  .query({filter: r.email})
  .query({show_emails: true})
  .end(function(err,res) {
    if (err || 200 != res.status) {
      console.log(err);
      fn(new Error(`Invalid response ${res.status} when validating.`));
      return;
    } else if (res.body.length != 1) {
      console.log(res.body);
      fn(new Error("Woops! We can't invite you. You should join Code4Nation forum first before joining our slack."));
      return;
    } else {
      invite(r, fn)
    }
  })
}

export function invite({ org, token, email, channel }, fn){
  let data = { email, token };

  if (channel) {
    data.channels = channel;
    data.ultra_restricted = 1;
    data.set_active = true;
  }

  request
  .post(`https://${org}.slack.com/api/users.admin.invite`)
  .type('form')
  .send(data)
  .end(function(err, res){
    if (err) return fn(err);
    if (200 != res.status) {
      fn(new Error(`Invalid response ${res.status}.`));
      return;
    }

    // If the account that owns the token is not admin, Slack will oddly
    // return `200 OK`, and provide other information in the body. So we
    // need to check for the correct account scope and call the callback
    // with an error if it's not high enough.
    let {ok, error: providedError, needed} = res.body;
    if (!ok) {
      if (providedError === 'missing_scope' && needed === 'admin') {
        fn(new Error(`Missing admin scope: The token you provided is for an account that is not an admin. You must provide a token from an admin account in order to invite users through the Slack API.`));
      } else if (providedError === 'already_invited') {
        fn(new Error('You have already been invited to slack. Check for an email from feedback@slack.com.'));
      } else if (providedError === 'already_in_team') {
        fn(new Error(`Already invited. Sign in at https://${org}.slack.com.`));
      } else {
        fn(new Error(providedError));
      }
      return;
    }

    fn(null);
  });
}
