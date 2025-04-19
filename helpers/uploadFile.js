const uploadFile = async ({ uri, name, type }) => {
  const data = new FormData();

  data.append("file", {
    uri,
    type,
    name,
  });

  data.append("upload_preset", "chat-app-file");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/db8xtzpvi/image/upload`,
    {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  const result = await response.json();
  return result;
};

export default uploadFile;
