FROM oraclelinux:8-slim
ARG release=19
ARG update=9

RUN  microdnf install oracle-release-el8 && \
  microdnf install oracle-instantclient${release}.${update}-basic oracle-instantclient${release}.${update}-devel oracle-instantclient${release}.${update}-sqlplus && \
  microdnf install nodejs &&\
  microdnf install iputils telnet -y &&\
  microdnf clean all

# Uncomment if the tools package is added
# ENV PATH=$PATH:/usr/lib/oracle/${release}.${update}/client64/bin

# Create app directory (with user `node`)
RUN mkdir -p /app

WORKDIR /app
COPY package*.json ./

RUN npm install

# Bundle app source code
COPY . .

RUN npm install --only=production

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=5500

EXPOSE ${PORT}
CMD [ "node", "index.js" ]

# docker build -t docker.io/migutak/cache:5.6.
# index watch_stage 
