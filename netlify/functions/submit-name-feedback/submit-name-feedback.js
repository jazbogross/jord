exports.handler = async function() {
  return {
    statusCode: 410,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify({
      message: "The garden archive is read-only and no longer accepts submissions."
    })
  };
};
