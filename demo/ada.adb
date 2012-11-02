type Day_type   is range    1 ..   31;
type Month_type is range    1 ..   12;
type Year_type  is range 1800 .. 2100;
type Hours is mod 24;
type Weekday is (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday); 
 
type Date is
   record
     Day   : Day_type;
     Month : Month_type;
     Year  : Year_type;
   end record;