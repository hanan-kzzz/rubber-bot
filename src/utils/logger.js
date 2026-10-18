/**
 * Formats timestamps in Indian Standard Time (Asia/Kolkata)
 */
function getIstTimestamp() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false
  }).format(new Date());
}

const logger = {
  info: (msg, ...args) => {
    console.log(`[${getIstTimestamp()}] [INFO] ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`[${getIstTimestamp()}] [WARN] ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`[${getIstTimestamp()}] [ERROR] ${msg}`, ...args);
  },
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${getIstTimestamp()}] [DEBUG] ${msg}`, ...args);
    }
  }
};

module.exports = logger;
