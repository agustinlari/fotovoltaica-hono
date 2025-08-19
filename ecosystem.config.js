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
        PORT: 8787,
        ENABLE_DEV_AUTH: 'false',
        KEYCLOAK_BASE_URL: 'http://localhost:8080',
        KEYCLOAK_REALM: 'master',
        KEYCLOAK_CLIENT_ID: 'fotovoltaica-client',
        DATABASE_URL: 'postgresql://postgres:Osmos2017@localhost:5432/fvprincipal'
      },
      log_file: '/var/log/pm2/fotovoltaica-backend.log',
      error_file: '/var/log/pm2/fotovoltaica-backend-error.log',
      out_file: '/var/log/pm2/fotovoltaica-backend-out.log',
      time: true
    }
  ]
};