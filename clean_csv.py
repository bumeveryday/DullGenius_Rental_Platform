
import csv
import io

input_path = r"c:\Users\USER\Desktop\OSS\BoardGameRent\dullgboardgamerent\csv 파일들\DullG_BoardGame_Rental - Games (2).csv"
output_path = r"c:\Users\USER\Desktop\OSS\BoardGameRent\dullgboardgamerent\csv 파일들\cleaned_games.csv"

# 유지할 컬럼과 매핑 (CSV 헤더 -> DB 컬럼)
# raw_games 테이블: id,name,category,image,naver_id,bgg_id,status,difficulty,genre,players,tags,total_views,dibs_count,review_count,avg_rating
# 추가로 renter, due_date는 'initial_renter', 'initial_due_date'로 변경하여 보존 (마이그레이션용)
column_mapping = {
    'id': 'id',
    'name': 'name',
    'category': 'category',
    'image': 'image',
    'naver_id': 'naver_id',
    'bgg_id': 'bgg_id',
    'status': 'status',
    'difficulty': 'difficulty',
    'genre': 'genre',
    'players': 'players',
    'tags': 'tags',
    'total_views': 'total_views',
    'dibs_count': 'dibs_count',
    'review_count': 'review_count',
    'avg_rating': 'avg_rating',
    # 임시 보존
    'renter': 'renter',
    'due_date': 'due_date',
    'condition': 'condition'
}

def clean_csv():
    with open(input_path, 'r', encoding='utf-8') as f:
        # 1. 헤더 처리
        reader = csv.DictReader(f)
        data = list(reader)
        
        # 2. 새로운 헤더 정의
        new_headers = list(column_mapping.values())
        
        with open(output_path, 'w', encoding='utf-8', newline='') as out_f:
            writer = csv.DictWriter(out_f, fieldnames=new_headers)
            writer.writeheader()
            
            for row in data:
                new_row = {}
                for old_key, new_key in column_mapping.items():
                    val = row.get(old_key, '').strip()
                    
                    # 데이터 정제
                    if new_key == 'status':
                        # 일관된 상태값
                        if val == '대여중': val = 'RENTED'
                        elif val == '찜' or val == '예약': val = 'RESERVED'
                        else: val = 'AVAILABLE' # 기본값
                        
                    if new_key == 'image' and val == '':
                        val = None # 이미지가 없으면 null
                        
                    # 숫자 필드 빈값 처리 -> 0
                    if new_key in ['total_views', 'dibs_count', 'review_count'] and val == '':
                        val = 0
                        
                    new_row[new_key] = val
                
                writer.writerow(new_row)

    print(f"Successfully created cleaned CSV at: {output_path}")

if __name__ == "__main__":
    clean_csv()
