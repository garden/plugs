def qsort(list: List[Int]): List[Int] = {
  if (list == Nil)
    Nil
  else {
    val pivot = list.head
    val tail = list.tail
    val partitioned = tail.partition(x => x < pivot)
    val smaller = partitioned._1
    val rest = partitioned._2
    qsort(smaller) ::: pivot :: qsort(rest)
  }
}