# WebHookSever
Node.JS and Typescript are required.

Enable webhooks for the desired repositories and add the Payload-URL (including the Port) and the Git-Secret in the webhook settings of each repo.

Add Git-Secret and Port in the config.json.

In the hooks.json you can add repos which should be updated by entering the name of the repository, the path to the shell script which should be executed and the branch which will trigger the execution on push. 

Run "npm install" to install dependecies before first use.
Run "npm start" to build and start the server.

Don't forget to forward the Port you want to use to the machine you are running the server on.
