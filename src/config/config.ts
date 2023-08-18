export const config = {
    port: process.env.PORT || 4003,
    db: {
      host: process.env.DB_HOST || '112.78.1.3',
      port:  3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'dasuka@!@#',
      database: process.env.DB_NAME || 'dasuka-dev',      
    }    
  };