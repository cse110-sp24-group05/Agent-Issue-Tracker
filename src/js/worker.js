// worker.js
// Cloudflare Worker entry point. Routes HTTP requests to handlers in
// handlers.js. SQL lives in db.js; shared validators and response builders
// live in helpers.js.


import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  claimIssue,
  postResult,
  closeIssue
} from './handlers.js';


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;


    console.log('PATH:', url.pathname);
    console.log('METHOD:', request.method);


    // GET /api/issues
    if (url.pathname === '/api/issues' && method === 'GET') {
      return getAllIssues(env);
    }


    // GET /api/issues/:id
    if (url.pathname.startsWith('/api/issues/') && method === 'GET') {
      const id = url.pathname.split('/')[3];
      return getIssueById(id, env);
    }


    // POST /api/issues
    if (url.pathname === '/api/issues' && method === 'POST') {
      return createIssue(request, env);
    }


    // POST /api/issues/:id/claim
    const isClaim = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/claim');
    if (isClaim && method === 'POST') {
      const id = url.pathname.split('/')[3];
      return claimIssue(id, request, env);
    }


    // POST /api/issues/:id/result
    const isResult = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/result');
    if (isResult && method === 'POST') {
      const id = url.pathname.split('/')[3];
      return postResult(id, request, env);
    }


    // POST /api/issues/:id/close
    const isClose = url.pathname.startsWith('/api/issues/') && url.pathname.endsWith('/close');
    if (isClose && method === 'POST') {
      const id = url.pathname.split('/')[3];
      return closeIssue(id, env);
    }


    // PUT /api/issues/:id
    const isPlainIssuePath = url.pathname.startsWith('/api/issues/')
      && !url.pathname.endsWith('/claim')
      && !url.pathname.endsWith('/result')
      && !url.pathname.endsWith('/close');
    if (isPlainIssuePath && method === 'PUT') {
      const id = url.pathname.split('/')[3];
      return updateIssue(id, request, env);
    }


    // DELETE /api/issues/:id
    if (url.pathname.startsWith('/api/issues/') && method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      return deleteIssue(id, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};
