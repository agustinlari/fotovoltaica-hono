module.exports = {
  apps: [
    {
      name: 'fotovoltaica-backend',
      script: './dist/index.js',
      cwd: '/home/osmos/proyectos/fotovoltaica/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8787
      },
      log_file: '/var/log/pm2/fotovoltaica-backend.log',
      error_file: '/var/log/pm2/fotovoltaica-backend-error.log',
      out_file: '/var/log/pm2/fotovoltaica-backend-out.log',
      time: true
    }
  ]
};