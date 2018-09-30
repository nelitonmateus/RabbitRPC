<?php

require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class RabbitRpcClient
{
    private $connection;
    private $channel;
    private $callback_queue;
    private $response;
    private $corr_id;

    public function __construct()
    {
        $this->connection = new AMQPStreamConnection(
            'localhost',
            5672,
            'guest',
            'guest'
        );
        $this->channel = $this->connection->channel();
        list($this->callback_queue, ,) = $this->channel->queue_declare(
            "",
            false,
            false,
            true,
            false
        );
        $this->channel->basic_consume(
            $this->callback_queue,
            '',
            false,
            false,
            false,
            false,
            array(
                $this,
                'onResponse'
            )
        );
    }

    public function onResponse($rep)
    {
        if ($rep->get('correlation_id') == $this->corr_id) {
            $this->response = $rep->body;
        }
    }

    public function call($n)
    {
        $this->response = null;
        $this->corr_id = uniqid();

        $msg = new AMQPMessage(
            (string) $n,
            array(
                'correlation_id' => $this->corr_id,
                'reply_to' => $this->callback_queue
            )
        );
        $this->channel->basic_publish($msg, '', 'rpc_queue');
        while (!$this->response) {
            $this->channel->wait();
        }
        return ($this->response);
    }
}

	
	$arrayLetrasNome = str_split($_POST['nome']);
	$arrayCPF = str_split($_POST['cpf']);
	$arrayEmail = str_split($_POST['email']);
	$arrayNumeroTelefone = str_split($_POST['telefone']);

	for($i = count($arrayLetrasNome); $i < 60; $i++){
		array_push($arrayLetrasNome,'#');
	}
		
	for($i = count($arrayEmail); $i < 60; $i++){
		array_push($arrayEmail,'#');
	}
	
	for($i = count($arrayNumeroTelefone); $i <= 15; $i++){
		array_push($arrayNumeroTelefone,'#');
	}
	
	$RPCMessage = array_merge($arrayLetrasNome, $arrayCPF, $arrayEmail, $arrayNumeroTelefone);
	$RPCMessage = str_replace(",", '', implode($RPCMessage));
		
	$Rabbit_rpc = new RabbitRpcClient();
	$response = $Rabbit_rpc->call($RPCMessage);
	echo "<script>
	alert('$response');
	window.location.href='http://localhost/RPCPosicional';
	</script>";
?>
