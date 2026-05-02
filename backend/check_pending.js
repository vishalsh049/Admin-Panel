const sequelize = require('./config/db');

sequelize.query('SELECT COUNT(*) as pending_count FROM expenses WHERE status != "Paid"')
  .then(result => {
    console.log('Pending expenses:', result[0][0].pending_count);
    process.exit(0);
  })
  .catch(err => {
    console.log('Error:', err.message);
    process.exit(1);
  });