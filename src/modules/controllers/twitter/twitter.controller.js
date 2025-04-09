import { TwitterApi } from 'twitter-api-v2';
import { TwitterSchema } from '../../schemas/twitter.schema.js';
import { scrapeGoogleNewsRSS } from '../../../common/utils/news.js';
import axios from 'axios';
import  * as cheerio  from 'cheerio';
import {JSDOM} from 'jsdom'
import { Readability } from '@mozilla/readability';
import { fetchRecentNews } from './news.js';
const CLIENT_ID = 'SnRmY2pMekxzRDlFM0psdHZ5dV86MTpjaQ';
const CLIENT_SECRET = 'U6ylpB5-ygfS3Lx23IUu0mioOLNY-pPTqgEjxfXAwKSIdAQvG2';
const REDIRECT_URI = 'https://itoolsai-frontend.onrender.com/auth/twitter/callback';
const _REDIRECT_URI = 'http://localhost:5173/auth/twitter/callback';
const _twitterClient = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
const config = { appKey: "z7tkLFR0B8FzGtRi5OUzEM7Z1", appSecret: "LS4DSvaYr4NiIhdjcm2xjWBRmPggu3T0gBHHD92qdbOIP2gUN0" };

const twitterClient = new TwitterApi({ appKey: "z7tkLFR0B8FzGtRi5OUzEM7Z1", appSecret: "LS4DSvaYr4NiIhdjcm2xjWBRmPggu3T0gBHHD92qdbOIP2gUN0" });
// Temporary store for `codeVerifier` (Replace with a DB/Redis for production)
const verifiers = new Map();  

// 1️⃣ **Generate Twitter Auth URL**
export async function getAuthUrl(req, res) {
  const { _url, _codeVerifier, _state } = _twitterClient.generateOAuth2AuthLink(REDIRECT_URI, {
    scope: ['users.read', 'tweet.read', 'offline.access', 'tweet.write'],
  });
  const { url, oauth_token, oauth_token_secret } = await twitterClient.generateAuthLink(REDIRECT_URI, {
    scope: ['users.read', 'tweet.read', 'offline.access', 'tweet.write'],
  });
  // Store `codeVerifier` temporarily (Use Redis/DB in production)
  verifiers.set(oauth_token, oauth_token_secret);

  console.log('Auth URL:', url);
  res.json({ url, oauth_token });
}

// 2️⃣ **Handle Twitter Callback & Exchange Code for Token**
export async function getUserDetails(req, res) {
  const { oauth_token, oauth_verifier } = req.body;
  // console.log(code,state)
  if (!oauth_token || !oauth_verifier|| !verifiers.has(oauth_token)) {
    return res.status(400).json({ error: 'Invalid request or state mismatch' });
  }
 try {
    const oauth_token_secret = verifiers.get(oauth_token);
   // verifiers.delete(state); // Remove it after use

    console.log('Received Code:', oauth_token);
    console.log('Stored Code Verifier:', oauth_token_secret);

    // Exchange code for access token
    const client = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    })
    const { accessToken, accessSecret } =
      await client.login(oauth_verifier);
console.log('Access Token:', accessToken, accessSecret);
    const loggedClient = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken,
      accessSecret,
    });
    let user  = (await loggedClient.v2.me());
    let { id, name, username } = user.data;
    console.log(req.userId, 
      id, name, username, accessToken, accessSecret);
    
    
    const twitteruser = new TwitterSchema({
      twitterAccessToken:  accessToken,
      twitterAccessSecret: accessSecret,
      twitterName: name,
      ownerId: req.userId
    });
    await twitteruser.save();

    // ✅ Send tokens to frontend (Store them client-side)
    res.json({ name });
  } catch (error) {
    console.error('Twitter Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
export async function getTwitterUser(req, res){
   const user = await TwitterSchema.findOne({ ownerId: req.userId });
   if(user) return res.json({name: user.twitterName});
   return res.json(null);
}
export async function setTwitterContent(req, res) {
  let {language, contentType, country} = req.body;
  if([language, contentType, country].every(a => a !==undefined)) return res.json(false);
 await TwitterSchema.findOneAndUpdate({ ownerId: req.userId}, {contentType, language, country});
 res.json(true);
}

export async function removeTwitterAccount(req, res) {
  await TwitterSchema.findOneAndDelete({ ownerId: req.userId});
  res.json(true);
 }

// Refresh Twitter Token Directly (If Expired)
const refreshTwitterToken = async (userId) => {
    try {
        const user = await TwitterSchema.findById(userId);
        if (!user) throw new Error('User not found');
console.log(user);
        const { twitterRefreshToken } = user;
        const client = new TwitterApi({clientId: CLIENT_ID, clientSecret: CLIENT_SECRET});
        const {accessToken, refreshToken} = await client.refreshOAuth2Token(twitterRefreshToken);
       

        await TwitterSchema.updateOne({_id: userId}, {twitterAccessToken:accessToken, twitterRefreshToken: refreshToken});
        return refreshToken;
    } catch (error) {
      console.log(error)
        console.error('❌ Token Refresh Failed:', error.response?.data || error.message);
        return null;
    }
};

// Upload Image to Twitter
const uploadImageToTwitter = async (accessToken, imageUrl) => {
    try {
      console.log(imageUrl)
        const { data: imageBuffer } = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const client = new TwitterApi({
          appKey: 'wsQoRiHnbCWHxu5zwwAl9wgzH',
          appSecret: 'S4h3mVjT6KLHCYihYj2bzIYhjyCtiVVlwB3HU9lvuYQgsBsRqR',
          accessToken: '1483104558658334720-ut3KZPsFGD0Eq1eByeEcsBhVgTLke4',
          accessSecret: '5lKZzcYrKv2wF6RqzuE7SEdBu4HTBvon7Xy9O8qrnNGha'
          
        });
        const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/jpeg'});
        return mediaId;
    } catch (error) {
     console.dir(error)
        console.error('❌ Image Upload Failed:', error.response?.data || error.message);
        return null;
    }
};

// Post on Twitter (Handles Expired Token Automatically)
const postOnTwitter = async (userId, text, imageUrl) => {
    try {
      const user = await TwitterSchema.findById(userId);
        if (!user) throw new Error('User not found');

        let accessToken = user.twitterAccessToken;
        let mediaId = imageUrl ? await uploadImageToTwitter(accessToken, imageUrl) : null;

        const postData = { text, ...(mediaId && { media: { media_ids: [mediaId] } }) };

        const { data } = await axios.post(
            'https://api.twitter.com/2/tweets',
            postData,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        return data;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('🔄 Token Expired, Refreshing & Retrying...');
            const newAccessToken = await refreshTwitterToken(userId);
            if (!newAccessToken) return null;
            return await postOnTwitter(userId, text, imageUrl); // Retry with new token
        }

        console.error('❌ Twitter Post Failed:', error.response?.data || error.message);
        return null;
    }
};
export async function postDataToX(req, res) {
  try {
   // await TwitterSchema.deleteMany();
    
    const users = await TwitterSchema.find({});
    console.log(users);
    for(let i=0; i<users.length; i++){
      const user = users[i];
      const news = await fetchRecentNews(user.contentType, user.language, user.country);
      await postOnTwitter(user._id, news.summary, news.image);
      console.log('done')
    }
    res.status(200).json('done')
  } catch(err){
   // TwitterSchema.deleteMany().then(console.log)
console.log(err)
  }
}
 
