import request from "request";
import parser from "set-cookie-parser";
import ua from "user-agents";
import util from "util";
import fs from "fs";
class RoXError extends Error {
  constructor(message) {
    (this.message = message), (this.name = "RoXError");
  }
}
class Session {
  #response;
  #cookie_;
  constructor() {
    this.#response = "";
    this.cookie = "";
    this._cookie = "";
    this.#cookie_ = [{}];
    this.requests = util.promisify(request);
    this.headers = {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      cookie: this.cookie,
      "sec-ch-ua":
        '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": new ua().data.userAgent,
    };
  }
  /*
   * @params
   * * data: array []
   */
  unique(data) {
    let array = [];
    for (let value of data.reverse()) {
      if (
        !array.find((e) => e.name === value.name) &&
        Object.keys(value).length >= 1
      ) {
        array.push(value);
      }
    }
    return array;
  }
  setCookie(response) {
    this._cookie = parser.parse(response);
    this.#cookie_ = [/*...this.#cookie_,*/ ...this._cookie];
    this.#cookie_ = this.unique(this.#cookie_);
    this.cookie = this.#cookie_.map((e) => `${e.name}=${e.value}`).join("; ");
  }
  /*
   * @params
   * * url: string https://example.com
   * * data: URLSearchParams name=value&example=example
   * * headers: object {}
   */
  async post(url, data, headers) {
    this.headers = {
      ...this.headers,
      cookie: this.cookie,
      ...headers,
    };
    this.#response = await this.requests({
      url: url,
      body: data,
      headers: this.headers,
      method: "POST",
    });
    this.setCookie(this.#response);
    return this.#response;
  }
  async get(url, data, headers) {
    this.headers = {
      ...this.headers,
      ...headers,
    };
    this.#response = await this.requests({
      url: url,
      body: data,
      headers: this.headers,
      method: "GET",
    });
    this.setCookie(this.#response);
    return this.#response;
  }
}
export default Session;
