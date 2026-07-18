import paramiko, sys
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('82.25.87.145', port=65002, username='u461432591', password='JJ@dagym1!', timeout=15)
# Check if upload-media.php exists and what it contains
stdin, stdout, stderr = client.exec_command('ls -la /home/u461432591/domains/felcin.com/nodejs/upload-media.php /home/u461432591/domains/felcin.com/public_html/upload-media.php 2>&1')
sys.stdout.buffer.write(stdout.read())
stdin2, stdout2, stderr2 = client.exec_command('head -30 /home/u461432591/domains/felcin.com/public_html/upload-media.php 2>&1')
sys.stdout.buffer.write(stdout2.read())
client.close()
