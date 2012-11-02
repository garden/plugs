program TEST 
  integer ans 
  do 
    read (*,*) ans 
    if (ans.eq.42) stop 
    write (*,*) ans 
  enddo 
  stop 
end