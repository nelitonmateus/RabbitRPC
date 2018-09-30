const amqp = require('amqplib/callback_api');
const js2xmlparser = require('js2xmlparser');
var isJson = false;
const jsonResponse = {
    "result" : "OK"
}

const posResponse = 'OK########';

amqp.connect('amqp://localhost', (err, conn) => {

    conn.createChannel((err, ch) => {

        const queue = 'rpc_queue';
        ch.assertQueue(queue, { durable: false });
        ch.prefetch(1);

        console.log(' [x] Esperando chamadas RPC para Converter');

        ch.consume(queue, function reply(msg) {

            
            let contatoXML = converterMensagem(msg.content.toString());
            enviarMensagemConvertida(conn,ch,msg,contatoXML);
            console.log("Mensagem convertida enviada!")
            ch.ack(msg);
        });
    });
    ;
});


function converterMensagem(str){
    
    let mensagemConvertida = "";
    if (IsJsonString(str)){
        isJson = true;
        mensagemConvertida = js2xmlparser.parse("contato",JSON.parse(str));
        mensagemConvertida = mensagemConvertida.replace("<?xml version='1.0'?>","$$");
    }else{
        isJson = false;
        mensagemConvertida =  
        "$$\n" +
        "<contato>\n" +
            "\t<nome> $NOME </nome>\n" +
            "\t<cpf> $CPF </cpf>\n" +
            "\t<email> $EMAIL </email>\n" +
            "\t<telefone> $FONE </telefone>\n" +
        "</contato>";    
        
        mensagemConvertida = mensagemConvertida.replace("$NOME", str.substr(0,60).replace(/#/g,''));
        mensagemConvertida = mensagemConvertida.replace("$CPF", str.substr(60,11).replace(/#/g,''));
        mensagemConvertida = mensagemConvertida.replace("$EMAIL", str.substr(71,60).replace(/#/g,''));
        mensagemConvertida = mensagemConvertida.replace("$FONE", str.substr(131,15).replace(/#/g,''));                
    }
    
    return mensagemConvertida;

}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function enviarMensagemConvertida(conn,channel,message,mensagemConvertida){
    conn.createChannel((err, ch) => {
        ch.assertQueue('', { exclusive: true }, (err, q) => {

            const correlationId = message.properties.correlationId;
            console.log("ID de envio (Mensagem convertida) : " + correlationId.toString());

            console.log(`Enviando mensagem convertida...`);
      

            ch.sendToQueue('rpc_queue_xml',
                new Buffer(mensagemConvertida), {
                            correlationId: correlationId,
                            replyTo: q.queue
                    }
            );

            ch.consume(q.queue, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                        console.log("ID Resposta (Front) : "+ msg.properties.correlationId + "\n")
                        channel.sendToQueue(message.properties.replyTo,
                            new Buffer(isJson ? JSON.stringify(jsonResponse) : posResponse),
                            { correlationId: message.properties.correlationId });
                }
            }, { noAck: false });

        });
    });
}