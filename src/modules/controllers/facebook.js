import Session from "./session.js";

export class FacebookPost {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.id = "";
    this.cookie = "";
    this.token = "";
  }
  kGetCsrf(body, email, pass) {
    const query = new URLSearchParams();
    query.append("lsd", body.match('name="lsd" value="(.*?)"')?.[1]);
    query.append("jazoest", body.match('name="jazoest" value="(.*?)"')[1]);
    query.append("m_ts", body.match('name="m_ts" value="(.*?)"')[1]);
    query.append("li", body.match('name="li" value="(.*?)"')[1]);
    query.append("try_number", "0");
    query.append("unrecognized_tries", "0");
    query.append("email", email);
    query.append("pass", pass);
    query.append("login", "Log In");
    query.append("bi_xrwh", "0");
    const action = body.match('method="post" action="(.*?)"')?.[1];

    return {
      query: query.toString(),
      action,
    };
  }

  async getCookie() {
    try {
      const request = new Session();
      const csrf = await request.get("https://mbasic.facebook.com");
      const { query, action } = this.kGetCsrf(
        csrf.body,
        this.email,
        this.password,
      );
      console.log(query, action);
      const response = await request.post(
        `https://mbasic.facebook.com/${action}`,
        query,
      );
      console.log(response.body, request, response);
      const cookie = request._cookie;
      const c_user = cookie.find((e) => e.name === "c_user").value;
      this.cookie = request.cookie.concat(`; m_page_voice=${c_user}`);
      this.id = c_user;

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async getToken() {
    try {
      const session = new Session();
      const csrf = await session.get(
        "https://mbasic.facebook.com/adsmanager/manage",
        null,
        {
          cookie: this.cookie,
        },
      );
      const act = csrf.body.match(/act=(.*?)\d+/)[0];
      const _token = await session.get(
        `https://adsmanager.facebook.com/adsmanager/manage?${act}&breakdown_regrouping=1`,
        null,
        {
          cookie: this.cookie,
        },
      );
      const token = _token.body.match('accessToken="(.*?)"')[1];
      this.token = token;
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async getPages() {
    try {
      const session = new Session();
      const _pages = await session.get(
        `https://graph.facebook.com/${this.id}/accounts?access_token=${this.token}`,
        null,
        {
          cookie: this.cookie,
        },
      );

      const page = JSON.parse(_pages.body).data.map((value) => ({
        id: value.id,
        name: value.name,
        token: value.access_token,
      }));

      /*      let content = ["ENTERTAINMENT", "SPORTS", "BUSINESS", "TECHNOLOGY", "HEALTH", "SCIENCE"];
            content = content[Math.floor(Math.random() * content.length)];
            ToPost.insert({ ...page, cookie: this.cookie, content });*/

      return { page, cookie: this.cookie };
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async postToFacebook(cookie, token, id, message, photo) {
    const session = new Session();
    let posted;
    if (photo) {
      posted = await session.post(
        `https://graph.facebook.com/${id}/photos?access_token=${token}`,
        JSON.stringify({
          message,
          url: photo,
        }),
        {
          "content-type": "application/json",
          cookie,
        },
      );
    } else {
      posted = await session.post(
        `https://graph.facebook.com/${id}/feed?message=${encodeURI(
          message,
        )}&access_token=${token}`,
        "",
        { cookie },
      );
    }

    return posted.body;
  }
}
