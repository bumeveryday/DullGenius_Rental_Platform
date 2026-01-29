-- 1. 만료된 찜 정리 함수 생성
create or replace function public.cleanup_expired_dibs()
returns void
language plpgsql
security definer
as $$
begin
  -- A. 만료된(30분이 지난) 찜 찾아서 반납(종료) 처리
  -- (아직 반납안됨 AND 타입이 DIBS AND 마감시간 지남)
  update public.rentals
  set returned_at = now()
  where type = 'DIBS'
    and returned_at is null
    and due_date < now();

  -- B. 방금 종료된 렌탈과 연결된 게임 카피들을 다시 'AVAILABLE'로 복구
  -- (status가 RESERVED 상태인 것만)
  update public.game_copies
  set status = 'AVAILABLE'
  where status = 'RESERVED'
    and copy_id in (
      select copy_id
      from public.rentals
      where type = 'DIBS'
        and returned_at is not null
        -- '방금' 처리된 것 뿐만 아니라, 
        -- 혹시라도 꼬여서 RESERVED 상태로 남은 만료된 건들도 처리하기 위해
        -- 현재 활성 상태(returned_at is null)인 렌탈이 없는 카피를 찾음
        and copy_id not in (
            select copy_id 
            from public.rentals 
            where returned_at is null
        )
    );
end;
$$;
