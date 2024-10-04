import subprocess

command = "sudo service nvargus-daemon restart"


def init():
    # Execute the command
    process = subprocess.run(command, shell=True, check=True)

    # Check the return code to confirm if the command executed successfully
    if process.returncode == 0:
        print("nvargus-daemon restarted successfully")
    else:
        print("Failed to restart nvargus-daemon")
