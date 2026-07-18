import paramiko, sys
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('82.25.87.145', port=65002, username='u461432591', password='JJ@dagym1!', timeout=15)
stdin, stdout, stderr = client.exec_command('grep -n "upload\\|php\\|POST\\|form" /home/u461432591/domains/felcin.com/nodejs/server.js | head -30')
sys.stdout.buffer.write(stdout.read())
client.close()
