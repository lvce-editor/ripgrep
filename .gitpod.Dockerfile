FROM gitpod/workspace-full-vnc

# Install NodeJS
RUN bash -c ". .nvm/nvm.sh \
    && nvm install 18.17.1 \
    && nvm use 18.17.1 \
    && nvm alias default 18.17.1"

RUN echo "nvm use default &>/dev/null" >> ~/.bashrc.d/51-nvm-fix
