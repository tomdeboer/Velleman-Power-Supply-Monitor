require('colors');
var SerialPort = require("serialport");

console.log(SerialPort.parsers);

var port = new SerialPort("/dev/tty.usbmodemFA131", {
  baudRate: 9600,
  // parser: SerialPort.parsers.byteLength(5)
});

var commtimer
var commands = [
	{
		command: "IOUT1?",
		fn_parser: SerialPort.parsers.byteLength(5),
		fn_transform: parseFloat
	},
	{
		command: "VOUT1?",
		fn_parser: SerialPort.parsers.byteLength(5),
		fn_transform: parseFloat
	}
]

var command_index = Infinity;
function sendNextCommand(stop=false){
	// Reset command_index if it's out of range
	command_index = (command_index >= commands.length-1) ? 0 : command_index + 1;

	var command_str = commands[command_index].command
	var fn_parser = commands[command_index].fn_parser;


	// Write the command and set appropriate parser
	port.write(command_str, () => { console.log(String("Sent..." + command_str).grey )});
	port.options.dataCallback = fn_parser.bind(port, port);;

}

port.on('open', function() {
	port.write('main screen turn on', function(err) {
		if (err) {
		  return console.log('Error on write: ', err.message);
		}
	});
	console.log(port);
	setTimeout(sendNextCommand, 500);
});
port.on('close', function () {
	console.error("Serial Port Closed");
})

// open errors will be emitted as an error event
port.on('error', function(err) {
	console.error('Error:', err.message);
});

port.on('data', function (data) {
	if (commands[command_index].first_measurement === undefined){
		commands[command_index].first_measurement = +new Date();
	}
	if (commands[command_index].total_measurement === undefined){
		commands[command_index].total_measurement = 0;
	}
	if (commands[command_index].count_measurement === undefined){
		commands[command_index].count_measurement = 0;
	}

	var data = commands[command_index].fn_transform(data.toString());

	commands[command_index].last_measurement = +new Date();
	commands[command_index].total_measurement += data;
	commands[command_index].count_measurement += 1;

	console.log(String(commands[command_index].command), '===', data);
	sendNextCommand();
});


process.on('SIGINT', () => {
	commands.forEach((command) => {
		var period = (command.last_measurement - command.first_measurement) / 1000;
		var average = command.total_measurement / command.count_measurement;

		console.log(String(command.command).bold.blue, String(average).underline, "during".grey, period, "seconds".grey);
	});
	process.exit();
});

