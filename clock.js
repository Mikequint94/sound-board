const secondHand = document.querySelector('.second-hand');
  const minuteHand = document.querySelector('.min-hand');
  const hourHand = document.querySelector('.hour-hand');
    function setDate() {
      const now = new Date();
      const seconds = now.getSeconds();
      const secondsDegrees = seconds * 6;
      const minutes = now.getMinutes();
      const minutesDegrees = minutes * 6;
      const hours = now.getHours();
      const hoursDegrees = hours * 30;

      secondHand.style.transform = `rotate(${secondsDegrees + 90}deg)`;
      minuteHand.style.transform = `rotate(${minutesDegrees + 90}deg)`;
      hourHand.style.transform = `rotate(${hoursDegrees + 90}deg)`;
    }

    setInterval(setDate, 1000);
