import csv
import os

input_path = r"c:\Users\USER\Desktop\OSS\BoardGameRent\dullgboardgamerent\db_seeds\raw_games.csv"
output_path = r"c:\Users\USER\Desktop\OSS\BoardGameRent\dullgboardgamerent\db_seeds\raw_games.csv"

rows = []
with open(input_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        rows.append(row)

# 1. Find max valid ID
max_id = 0
for row in rows:
    try:
        pid = int(row['id'])
        if pid < 10000: # Assuming valid manual IDs are small
            if pid > max_id:
                max_id = pid
    except:
        pass

next_id = max_id + 1
print(f"Max valid ID: {max_id}. Renumbering starts from: {next_id}")

# 2. Renumber large IDs
renumbered_count = 0
for row in rows:
    try:
        pid = int(row['id'])
        if pid >= 10000:
            row['id'] = str(next_id)
            next_id += 1
            renumbered_count += 1
    except:
        # If ID is not int, assign new ID
         row['id'] = str(next_id)
         next_id += 1
         renumbered_count += 1

# 3. Save
with open(output_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Processed {len(rows)} games. Renumbered {renumbered_count} items.")
