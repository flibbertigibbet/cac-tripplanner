## NOTICE: This file is written by ansible, and any changes made here will be overwritten on
#          next provision.
#          Modify azavea.opentripplanner/templates/otp.service.j2 to make changes stick.

[Unit]
Description=Start OpenTripPlanner process
After={{ otp_service_after }}

[Service]
Type=forking
User={{ otp_user }}
WorkingDirectory={{ otp_bin_dir }}
Restart=on-failure
ExecStart=/usr/bin/authbind /usr/bin/java -Xmx{{otp_process_mem}} -jar {{ otp_bin_dir }}/{{ otp_jar_name }} --server --analyst --port 80 --basePath {{ otp_data_dir}} --graphs {{ otp_data_dir }} --router default

[Install]
WantedBy={{ otp_service_wantedby }}
