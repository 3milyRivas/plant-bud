from background_removal import DEFAULT_MODEL, create_background_session


create_background_session(allow_download=True)
print(f"rembg {DEFAULT_MODEL} model is ready")
