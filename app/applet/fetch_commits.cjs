const https = require('https');

https.get('https://api.github.com/repos/Masterpiece2009/wanderlust/commits?path=api/index.py', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const commits = JSON.parse(data);
    commits.forEach(c => {
      console.log(c.sha, c.commit.message, c.commit.author.date);
    });
  });
}).on('error', err => console.error(err));
