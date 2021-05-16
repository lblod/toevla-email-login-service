FROM semtech/mu-javascript-template:1.5.0-beta.1
LABEL maintainer="Aad Versteden <madnificent@gmail.com>"

ENV APP_BASE_URL "https://toegankelijk.vlaanderen.be/"
ENV EMAIL_SENDER "noreply-toegankelijk@vlaanderen.be"
ENV OUTBOX_URI "http://data.toevla.org/id/mailfolder/outbox"

# see https://github.com/mu-semtech/mu-javascript-template for more info
