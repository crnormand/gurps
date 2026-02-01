## Metric Conversion

For lengths, GCS can display feet & inches (5'3"), feet, yards, miles, centimeters, meters, and kilometers.

For weights, pounds, onces, tons, kilograms and grams. There's also two variant suffixes that can be selected for both pounds ("lb", "#") and tones ("tn", "t").

```
| Imperial          | Game Metric   | Real Metric       |
| 1 inch (in.)      | 2.5 cm        | 2.54 cm           |
| 1 foot (ft.)      | 30 cm         | 30.48 cm          |
| 1 yard (yd.)      | 1 meter       | 0.914 meters      |
| 1 mile (mi.)      | 1.5 km        | 1.609 km          |
| 1 pound (lb.)     | 0.5 kg        | 0.454 kg          |
| 1 ton             | 1 metric ton  | 0.907 metric tons |
| 1 gallon (gal.)   | 4 liters      | 3.785 liters      |
| 1 quart (qt.)     | 1 liter       | 0.946 liters      |
| 1 ounce (oz.)     | 30 grams      | 28.349 grams      |
| 1 cubic inch (ci) | 16 cubic cm   | 1 6.387 cu. cm    |
| 1 cubic yard (cy) | 0.75 cubic m  | 0.765 cubic m     |
```

Temperature: When dealing with changes in temperature, one Fahrenheit degree is 5/9 the size of a degree Celsius. So a change of 45°F is equal to a change of 25°C. To convert actual thermometer readings, subtract 32 from the Fahrenheit temperature and multiply the result by 5/9.

Weight conversion is as you noted: 1 lb = 0.5 kg. Length as well: 1 yd = 1 m.

For consistency, all metric lengths are converted to meters, then to yards, rather than the variations at different lengths that the GURPS rules suggest.

Same for weights: all metric weights are converted to kilograms, then to pounds.
(these are for when you enter them into a field...)

https://github.com/richardwilkes/gcs/tree/master/model/fxp this directory has the various length & width code (fxp stands for fixed-point, since GCS tracks most everything using fixed-point values so that we get consistent output).
