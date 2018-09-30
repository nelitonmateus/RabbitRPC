const amqp = require('amqplib/callback_api');
const fs = require('fs');

amqp.connect('amqp://localhost', (err, conn) => {

    conn.createChannel((err, ch) => {

        const queue = 'rpc_queue_xml';
        ch.assertQueue(queue, { durable: false });
        ch.prefetch(1);

        console.log(' [x] Esperando chamadas RPC para Salvar em Arquivo');

        ch.consume(queue, function reply(msg) {

            let path = "arquivos";
            
            criarDiretorio(path);
            salvarArquivo(msg.content.toString());

            console.log("Respondendo para > " + msg.properties.replyTo.toString());
            console.log("ID de resposta > " + msg.properties.correlationId.toString());
            ch.sendToQueue(msg.properties.replyTo,
                new Buffer(msg.content.toString()),
                { correlationId: msg.properties.correlationId });
            ch.ack(msg);
        });
    });
    ;
});

function salvarArquivo(contato){
    console.log("Salvando os arquivos...");
    if (!fs.existsSync("arquivos/contatos.xml")){
        contato = contato.replace("$$","<?xml version='1.0'?>")
        fs.writeFileSync("arquivos/contatos.xml", contato, function(err){
            if(err) throw err;
        });
    }else{
        contato = contato.replace("$$","")
        fs.appendFileSync("arquivos/contatos.xml", contato, function(err){
            if(err) throw err;
        });
    }

}

function criarDiretorio(path){

    if (!fs.existsSync(path)){
        console.log("Criando diretório...");
        fs.mkdirSync(path);
    }

}
