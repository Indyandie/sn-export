# sn-export

[standard-notes]: https://standardnotes.com/
[deno]: https://deno.com/

Export [**Standard Notes**][standard-notes] backups to markdown files under their respective tags as directories.

## Dependencies

- [Standard Notes][standard-notes]
- [Deno][deno]

## User Manual

1. Clone this **repository**.
1. From the **Standard Notes** application
   1. Open **preferences** and select the **backups** sidebar
   1. Download a backup (Decrypted) of all your text-based data
   1. unzip the backup file
   1. convert unzipped txt file to json (`data.json`) and move it to the **repository**
1. From the **repository** run `deno task export-data`
1. Profit in `./output/` directory

### Custom File & Output

```shell
deno task export --file '/path/to/backup.json' --output '/path/to/output-directory'

# argument aliases
deno task export -f '/path/to/backup.json' -o '/path/to/output-directory'
```
