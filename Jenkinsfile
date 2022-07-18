node {
      def app
      stage('Clone repository') {

            checkout scm
      }
      stage("Docker build"){
        app = docker.build("migutak/cache")
      }

      stage('Test'){

        script {
          currentDateTime = sh(returnStdout: true, script: 'date -d \'+3 hour\' +%d%m%Y%H%M%S').trim()
        }
        sh "echo ...tests on ..ddmmyyyhhmmss.. ${currentDateTime}"

      }

      stage('Push image') {
        docker.withRegistry('https://registry.hub.docker.com', 'docker_credentials') {
            app.push("${currentDateTime}.${env.BUILD_NUMBER}")
            app.push("latest")
        }
      }

    }
