program :- get_char(X),get_char(Y),check(X,Y). 
check('4','2'):-!. 
check(X,Y):-write(X),get_char(Z),check(Y,Z).
:- program.