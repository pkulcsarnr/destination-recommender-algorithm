Shield: [![CC BY-NC-ND 4.0][cc-by-nc-nd-shield]][cc-by-nc-nd]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-NoDerivs 4.0 International License][cc-by-nc-nd].

[![CC BY-NC-ND 4.0][cc-by-nc-nd-image]][cc-by-nc-nd]

[cc-by-nc-nd]: http://creativecommons.org/licenses/by-nc-nd/4.0/
[cc-by-nc-nd-image]: https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png
[cc-by-nc-nd-shield]: https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg

# Airport recommendation for Many to Many case.

This repository contains a research project that was aimed to solve a many-to-many challenge when looking for available airports for multiple origin airports.

## Articles

The entire evolution of different approaches from row database, through graph databases to bit encoding has been documented in multiple articles found here:

- [Problem Statement and Naive Approach](https://medium.com/@pkulcsarsz/the-challenges-of-group-travel-planning-problem-statement-and-naive-approach-18846936c620)
- [From Problem to First Solution](https://medium.com/@pkulcsarsz/from-problem-to-solution-my-first-approach-to-group-travel-destination-recommendation-54517b8fc4ef)


## How to run benchmark and tests

To run the benchmark, use the command:
```
bun benchmark/benchmark.ts
```

To run the tests, use the command:
```
bun test
```