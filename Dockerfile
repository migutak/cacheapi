FROM oraclelinux:8.6

RUN  dnf -y install oracle-instantclient-release-el8 && \
     dnf -y install oracle-instantclient-basic oracle-instantclient-devel oracle-instantclient-sqlplus && \
     dnf install nodejs iputils telnet -y &&\
     rm -rf /var/cache/dnf

# Create app directory (with user `node`)
RUN mkdir -p /app

WORKDIR /app
COPY package*.json ./

RUN npm install

# Bundle app source code
COPY . .

RUN npm install --only=production

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=5600

EXPOSE ${PORT} 
CMD [ "node", "index.js" ]

# docker build -t docker.io/migutak/cache:5.7.3 .

