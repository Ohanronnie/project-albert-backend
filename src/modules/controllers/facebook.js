import Session from "./session.js";
import axios from 'axios'
export class FacebookPost {
  constructor(token, id) {
    this.id = id;
    this.token = token;
  }
  async validatePage(){
    try {
      let data = await axios.get(`https://graph.facebook.com/${this.id}?access_token=${this.token}`);
      console.log(data.data);
      console.log('hello')
      return ({
        ...data.data
      });
    } catch(err){
      console.log(err)
      return {
        error: err
      }
    }
  }
  async getPages() {
    try {
      const session = new Session();
      const _pages = await session.get(
        `https://graph.facebook.com/${this.id}?access_token=${this.token}`
      );
      console.log(_pages.body)

      return { page  };
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
        },
      );
    } else {
      posted = await session.post(
        `https://graph.facebook.com/${id}/feed?message=${encodeURI(
          message,
        )}&access_token=${token}`,
        "",
      );
    }
    console.log(posted,message,token,id)
    return posted.body;
  }
}
/*
const _x = new FacebookPost('EAAG5MBLBHpIBO0yuHlI00HbBesMzmWY59s5wRdcikoEf1X9SAt1HYbhr6q0UDMHkVVYfP5g1EOpqDLA7nb50KFeZB4EdZBZA7bWbIpPvGqEVBIJl9PeZBT9Ce4N6AV1Lab1rpckH27Cj2g3qX05vdjs1qgs8VoxhodZCRErd3Sll35HrNTXaE0eGQ9RPqYdBSq74eXZByZAZCh8ME1Lsjmr9SeuJPDHa0CAHbIJAr1fYH7AZD','1837273313674648');
console.log(await _x.getPages())*/