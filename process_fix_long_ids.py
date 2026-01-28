import csv
import os

# Paths
base_dir = r"c:\Users\USER\Desktop\OSS\BoardGameRent\dullgboardgamerent\db_seeds"
games_path = os.path.join(base_dir, "raw_games.csv")
rentals_path = os.path.join(base_dir, "rentals.csv")
reviews_path = os.path.join(base_dir, "reviews.csv")

# 1. Read Games
games = []
id_map = {} # old_id_str -> new_id_str
max_normal_id = 0

# Use utf-8-sig to handle BOM
with open(games_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    game_fieldnames = reader.fieldnames
    for row in reader:
        games.append(row)
        try:
            pid = int(row['id'])
            if pid < 10000:
                if pid > max_normal_id:
                    max_normal_id = pid
        except:
            pass

print(f"Max Normal ID found: {max_normal_id}")
next_id = 2000 # Start renumbering from a safe range (e.g. 2000) to avoid collisions
if max_normal_id >= 2000:
    next_id = max_normal_id + 1

# 2. Fix ONLY Long IDs
fixed_count = 0
for row in games:
    original_id = row['id']
    try:
        pid = int(original_id)
        if pid >= 10000: # Threshold for "Abnormal" (Timestamp IDs are ~1.7 trillion)
            new_id = str(next_id)
            id_map[original_id] = new_id
            row['id'] = new_id
            next_id += 1
            fixed_count += 1
    except ValueError:
        # Handle non-integer IDs if any
        new_id = str(next_id)
        id_map[original_id] = new_id
        row['id'] = new_id
        next_id += 1
        fixed_count += 1

print(f"Fixed {fixed_count} abnormal IDs. Preserved the rest.")

# 3. Process Rentals (Update game_id)
rentals = []
rentals_updated = 0
with open(rentals_path, 'r', encoding='utf-8') as f: # standard utf-8 for rentals/reviews usually
    reader = csv.DictReader(f)
    rental_fieldnames = reader.fieldnames
    for row in reader:
        gid = row['game_id']
        if gid in id_map:
            row['game_id'] = id_map[gid]
            rentals_updated += 1
        rentals.append(row)

# 4. Process Reviews (Update game_id)
reviews = []
reviews_updated = 0
with open(reviews_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    review_fieldnames = reader.fieldnames
    for row in reader:
        gid = row['game_id']
        if gid in id_map:
            row['game_id'] = id_map[gid]
            reviews_updated += 1
        reviews.append(row)

# 5. Save All Files
with open(games_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=game_fieldnames)
    writer.writeheader()
    writer.writerows(games)

with open(rentals_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=rental_fieldnames)
    writer.writeheader()
    writer.writerows(rentals)

with open(reviews_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=review_fieldnames)
    writer.writeheader()
    writer.writerows(reviews)

print(f"Saved updates. Updated references in {rentals_updated} rentals and {reviews_updated} reviews.")
