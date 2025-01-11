export default class Semaphore {
  constructor() {
    this.semaphore = false
  }

  // Function to wait for semaphore clearance
  async wait() {
    while (this.semaphore) {
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait for 100ms before checking again
    }
  }

  set(value) {
    this.semaphore = value
  }
}

// Example usage:
// const semaphore = new Semaphore();
// semaphore.setSemaphore(true); // Set semaphore to true
// await semaphore.waitForSemaphore(); // Wait for semaphore clearance
// semaphore.setSemaphore(false); // Set semaphore to false
