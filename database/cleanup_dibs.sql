-- 1. 만료된 찜 정리 함수 생성
create or replace function public.cleanup_expired_dibs()
returns void
language plpgsql
security definer
as $$
begin
  -- A. 만료된(30분이 지난) 찜 찾아서 반납(종료) 처리
  update public.rentals
  set returned_at = now()
  where type = 'DIBS'
    and returned_at is null
    and due_date < now();

  -- B. "활성 찜(Rentals)이 없는" 모든 RESERVED 상태의 카피를 AVAILABLE로 초기화
  --   1. 만료되어서 방금 A에서 처리된 건
  --   2. 모종의 이유로 Rentals 레코드가 삭제된 고아(Orphan) 건
  --   이 두 가지 모두 "현재 returned_at IS NULL 인 Rentals가 없는 카피"에 해당함.
  update public.game_copies
  set status = 'AVAILABLE'
  where status = 'RESERVED'
    and copy_id not in (
      select copy_id
      from public.rentals
      where returned_at is null
    );
end;
$$;
