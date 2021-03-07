import express, { Express, Request, Response } from 'express';
import * as bodyParser from 'body-parser';
import crypto from "crypto";
import fs from "fs";
import { exec } from "child_process";

type Hook = {name:string, path:string, branch:string};
const CONFIG = JSON.parse(fs.readFileSync('config.json', 'utf8'))

class WebHookServer {
    
    private app: Express;
    private readonly secret: string = CONFIG.gitSecret;
    private sigHeaderName: string;

    public static readonly PORT : number = CONFIG.port;

    constructor() {
        this.app = express();
        this.sigHeaderName = 'x-hub-signature-256';
        this.init();
    }

    private init(): void {
        this.app.use(bodyParser.json());
    }

    start(): void {
        this.app.post('/', (request, response) => {

            const payload = JSON.stringify(request.body);

            if (!payload) {
                console.log("Body is empty.");
                return;
            }

            if (!this.validateSignature(request, response)) {
                response.status(500).send({
                    message: 'Invalid signature.'
                });
                throw new Error("Invalid signature.");
            }
            try{
                this.action(request, response);
            }catch(e){
                response.status(500).send({
                    message:'Action error.'
                })
            }
            
        });
        this.app.listen(WebHookServer.PORT, () => console.log(`Listening on Port ${WebHookServer.PORT} ...`));
    }

    private validateSignature(request: Request, response: Response): boolean {
        //Get Signature from Secret
        const expectedSignature = "sha256=" +
            crypto.createHmac("sha256", this.secret)
                .update(JSON.stringify(request.body))
                .digest("hex");

        //Request-Header Signature
        const signature = request.headers[this.sigHeaderName];

        return signature === expectedSignature;
    }

    private action(request: Request, response: Response): void {
        const data = request.body;
        const rawFileDate = fs.promises.readFile('hooks.json', 'utf8');
        const hooks : Promise<Hook[]> = rawFileDate.then(result => JSON.parse(result))
        const repName = data.repository.name;

        hooks.then((hookArr : Hook[]) => {
            for (let hook of hookArr){
                if (hook.name === repName){
                        this.executeUpdateScript(data, hook.path, hook.branch)
                        .then((script : string)=>{
                            response.status(200).send({
                                message:`Updated branch with updatescript (Path: ${script})`
                            })
                        })
                        .catch((statusCode : number)=>{
                            response.status(statusCode).send({
                                message:`Failed updating branch.`
                            })
                        })                                          
                }
            }
        })
    }

    private executeUpdateScript(data: any, path: string, branch : string) : Promise<string>{
        return new Promise((resolve, reject) => {
            if (data.ref === "refs/heads/" + branch) {
                console.log("Executing Script: ")
                exec('sudo bash ' + path, (err, stdout, stderr) => {
                    if (err) {
                        return reject(500)
                    }
                    console.log(`stdout: ${stdout}`);
                    console.log(`stderr: ${stderr}`);
                });
                console.log("executed.");
                return resolve(path)  
            }
            return reject(404)
        })
    }
}
let server: WebHookServer = new WebHookServer();
server.start();

