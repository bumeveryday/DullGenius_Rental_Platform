import csv
import os

# Paths
base_dir = r"c:\Users\USER\Desktop\OSS\BoardGameRent\dullgboardgamerent\db_seeds"
games_path = os.path.join(base_dir, "raw_games.csv")
rentals_input_path = os.path.join(base_dir, "raw_rentals_rows.csv")
reviews_input_path = os.path.join(base_dir, "raw_reviews_rows.csv")

rentals_output_path = os.path.join(base_dir, "rentals.csv")
reviews_output_path = os.path.join(base_dir, "reviews.csv")

# 1. Load Valid Game IDs from raw_games.csv
valid_game_ids = set()
with open(games_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['id']:
            valid_game_ids.add(row['id'])

print(f"Loaded {len(valid_game_ids)} valid Game IDs from raw_games.csv")

# Helper function to fix ID
def fix_id(original_id):
    if original_id in valid_game_ids:
        return original_id
    
    # Try truncation (Last 4 digits)
    if len(original_id) > 4:
        truncated = original_id[-4:]
        if truncated in valid_game_ids:
            return truncated
            
    return original_id # Return original if no fix found (or print warning)

# 2. Process Rentals
rentals_fixed = 0
rentals_rows = []
if os.path.exists(rentals_input_path):
    with open(rentals_input_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            old_id = row['game_id']
            new_id = fix_id(old_id)
            if old_id != new_id:
                row['game_id'] = new_id
                rentals_fixed += 1
            rentals_rows.append(row)

    with open(rentals_output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rentals_rows)
    print(f"Processed Rentals. Fixed {rentals_fixed} IDs. Saved to rentals.csv")
else:
    print(f"Warning: {rentals_input_path} not found.")

# 3. Process Reviews
reviews_fixed = 0
reviews_rows = []
if os.path.exists(reviews_input_path):
    with open(reviews_input_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            old_id = row['game_id']
            new_id = fix_id(old_id)
            if old_id != new_id:
                row['game_id'] = new_id
                reviews_fixed += 1
            reviews_rows.append(row)

    with open(reviews_output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(reviews_rows)
    print(f"Processed Reviews. Fixed {reviews_fixed} IDs. Saved to reviews.csv")
else:
    print(f"Warning: {reviews_input_path} not found.")
