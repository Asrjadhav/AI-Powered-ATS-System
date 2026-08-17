const fs = require('fs');
fetch('http://localhost:3000/api/applications')
  .then(res => res.json())
  .then(data => console.log("Total api apps:", data.length))
  .catch(console.error);
