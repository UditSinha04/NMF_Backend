const bcrypt = require('bcryptjs');
bcrypt.hash('nmf@4321', 10).then(console.log);