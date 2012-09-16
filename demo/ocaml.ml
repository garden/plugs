(* Summing a list of integers *)
let rec sum xs =
  match xs with
    | []       -> 0
    | x :: xs' -> x + sum xs'

(* Quicksort *)
let rec qsort = function
   | [] -> []
   | pivot :: rest ->
       let is_less x = x < pivot in
       let left, right = List.partition is_less rest in
       qsort left @ [pivot] @ qsort right

(* Fibonacci Sequence *)
let rec fib_aux n a b =
  match n with
  | 0 -> a
  | _ -> fib_aux (n - 1) (a + b) a
let fib n = fib_aux n 0 1

(* Birthday paradox *)
let year_size = 365.

let rec birthday_paradox prob people =
    let prob' = (year_size -. float people) /. year_size *. prob  in
    if prob' < 0.5 then
        Printf.printf "answer = %d\n" (people+1)
    else
        birthday_paradox prob' (people+1) ;;

birthday_paradox 1.0 1

(* Church numerals *)
let zero f x = x
let succ n f x = f (n f x)
let one = succ zero
let two = succ (succ zero)
let add n1 n2 f x = n1 f (n2 f x)
let to_string n = n (fun k -> "S" ^ k) "0"
let _ = to_string (add (succ two) two)

(* Elementary functions *)
let square x = x * x;;
let rec fact x =
  if x <= 1 then 1 else x * fact (x - 1);;

(* Automatic memory management *)
let l = 1 :: 2 :: 3 :: [];;
[1; 2; 3];;
5 :: l;;

(* Polymorphism: sorting lists *)
let rec sort = function
  | [] -> []
  | x :: l -> insert x (sort l)

and insert elem = function
  | [] -> [elem]
  | x :: l -> 
      if elem < x then elem :: x :: l else x :: insert elem l;;

(* Imperative features *)
let add_polynom p1 p2 =
  let n1 = Array.length p1
  and n2 = Array.length p2 in
  let result = Array.create (max n1 n2) 0 in
  for i = 0 to n1 - 1 do result.(i) <- p1.(i) done;
  for i = 0 to n2 - 1 do result.(i) <- result.(i) + p2.(i) done;
  result;;
add_polynom [| 1; 2 |] [| 1; 2; 3 |];;

(* We may redefine fact using a reference cell and a for loop *)
let fact n =
  let result = ref 1 in
  for i = 2 to n do
    result := i * !result
   done;
   !result;;
fact 5;;

(* A Hundred Lines of Caml - http://caml.inria.fr/about/taste.en.html *)
(* OCaml page on Wikipedia - http://en.wikipedia.org/wiki/OCaml *)
