// Created with Chatgpt assistance — human reviewed and tested
// worker.js
// Cloudflare Worker entry point. Routes HTTP requests to handlers in
// handlers.js. SQL lives in db.js; shared validators and response builders
// live in helpers.js.


import {
  createIssue,
  getAllIssues,
  getReadyIssue,
  getIssueById,
  updateIssue,
  deleteIssue,
  claimIssue,
  putResult,
  closeIssue,
  blockIssue,
  getIssueHistory,
  loginOrRegister,
  updateUser
} from './handlers.js';

import { CORS_HEADERS } from './helpers.js';


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;


    if (method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }


    // GET /api/issues
    if (url.pathname === '/api/issues' && method === 'GET') {
      return getAllIssues(request,env);
    }

    // GET /api/issues/:id/history
    if (url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/history') && method === 'GET') {
      const id = url.pathname.split('/')[3];
      return getIssueHistory(id, env);
    }

    // GET /api/issues/ready — must be checked before the generic :id route
    if (url.pathname === '/api/issues/ready' && method === 'GET') {
      return getReadyIssue(request, env);
    }


    // GET /api/issues/:id
    const isGetById = url.pathname.startsWith('/api/issues/') && !url.pathname.endsWith('/history');
    if (isGetById && method === 'GET') {
      const id = url.pathname.split('/')[3];
      return getIssueById(id, env);
    }


    // POST /api/issues
    if (url.pathname === '/api/issues' && method === 'POST') {
      return createIssue(request, env);
    }


    // PUT /api/issues/:id/block
    const isBlock = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/block');
    if (isBlock && method === 'PUT') {
      const id = url.pathname.split('/')[3];
      return blockIssue(id,env);
    }

    // PUT /api/issues/:id/claim
    const isClaim = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/claim');
    if (isClaim && method === 'PUT') {
      return claimIssue(request, env);
    }

    // PUT /api/issues/:id/close
    const isClose = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/close');
    if (isClose && method === 'PUT') {
      const id = url.pathname.split('/')[3];
      return closeIssue(id, env);
    }

    // PUT /api/issues/:id/result_text
    const isResult = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/result_text');
    if (isResult && method === 'PUT') {
      const id = url.pathname.split('/')[3];
      return putResult(id, request, env);
    }

    // POST /api/login
    if (url.pathname === '/api/login' && method === 'POST') {
      return loginOrRegister(request, env);
    }

    // PUT /api/users/:id — change a user's display name
    if (url.pathname.startsWith('/api/users/') && method === 'PUT') {
      const id = url.pathname.split('/')[3];
      return updateUser(id, request, env);
    }

    // PUT /api/issues/:id
    const isPlainIssuePath = url.pathname.startsWith('/api/issues/')
      && !url.pathname.endsWith('/claim')
      && !url.pathname.endsWith('/result_text')
      && !url.pathname.endsWith('/close')
      && !url.pathname.endsWith('/block');
    if (isPlainIssuePath && method === 'PUT') {
      const id = url.pathname.split('/')[3];
      return updateIssue(id, request, env);
    }


    // DELETE /api/issues/:id
    if (url.pathname.startsWith('/api/issues/') && method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      return deleteIssue(id, env);
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  }
};
